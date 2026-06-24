<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Due;
use App\Models\Student;
use App\Models\StudentAssignment;
use App\Models\VehicleLog;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of students.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Student::query()
            ->with(['user', 'studentAssignments' => function ($q) {
                $q->whereNull('removed_date')->with('vehicle');
            }]);

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        // Filter by search (student_name)
        if ($request->has('search') && $request->search !== '') {
            $query->where('student_name', 'like', '%' . $request->search . '%');
        }

        // Filter by vehicle_id (active assignment)
        if ($request->has('vehicle_id') && $request->vehicle_id !== '') {
            $query->whereHas('studentAssignments', function ($q) use ($request) {
                $q->where('vehicle_id', $request->vehicle_id)->whereNull('removed_date');
            });
        }

        // Filter by is_active
        if ($request->has('is_active') && $request->is_active !== '') {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        // Filter by status
        if ($request->has('status') && $request->status !== '') {
            $status = $request->status;
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $students = $query->paginate(20);

        // For each student, include current monthly_fee from active assignment
        $items = collect($students->items())->map(function ($student) {
            $activeAssignment = $student->studentAssignments->first();
            $student->current_monthly_fee = $activeAssignment ? $activeAssignment->monthly_fee : null;
            $student->current_vehicle = $activeAssignment ? $activeAssignment->vehicle : null;
            return $student;
        });

        return $this->successResponse([
            'data' => $items,
            'current_page' => $students->currentPage(),
            'last_page'    => $students->lastPage(),
            'per_page'     => $students->perPage(),
            'total'        => $students->total(),
        ], 'Students retrieved successfully');
    }

    /**
     * Store a newly created student in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_name' => 'required|string|max:255',
            'class'        => 'nullable|string|max:50',
            'section'      => 'nullable|string|max:50',
            'user_id'      => 'required|exists:users,id',
            'is_active'    => 'boolean',
            'vehicle_id'   => 'nullable|exists:vehicles,id',
            'monthly_fee'  => 'required_if:vehicle_id,!=,null|nullable|numeric|min:0',
            'assigned_date'=> 'nullable|date',
        ]);

        $studentData = [
            'student_name' => $validated['student_name'],
            'class'        => $validated['class'] ?? null,
            'section'      => $validated['section'] ?? null,
            'user_id'      => $validated['user_id'],
            'join_date'    => $validated['assigned_date'] ?? today(),
            'is_active'    => $validated['is_active'] ?? true,
            'admin_id'     => auth()->id(),
        ];

        $student = Student::create($studentData);

        // Immediate assignment if vehicle_id provided
        if (!empty($validated['vehicle_id'])) {
            $assignment = StudentAssignment::create([
                'student_id'    => $student->id,
                'vehicle_id'    => $validated['vehicle_id'],
                'admin_id'      => auth()->id(),
                'monthly_fee'   => $validated['monthly_fee'],
                'assigned_date' => $validated['assigned_date'] ?? today(),
                'assigned_by'   => auth()->id(),
            ]);

            VehicleLog::create([
                'admin_id'       => auth()->id(),
                'vehicle_id'     => $validated['vehicle_id'],
                'event_type'     => 'student_added',
                'reference_id'   => $student->id,
                'reference_type' => 'student',
                'note'           => "Student '{$student->student_name}' was registered and assigned.",
                'performed_by'   => auth()->id(),
            ]);

            $student->load('studentAssignments.vehicle');
        }

        return $this->successResponse($student, 'Student registered successfully', 201);
    }

    /**
     * Display the specified student.
     */
    public function show($id): JsonResponse
    {
        $query = Student::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $student = $query->findOrFail($id);

        $student->load([
            'user',
            'studentAssignments' => function ($q) {
                $q->with('vehicle')->orderBy('assigned_date', 'desc');
            }
        ]);

        // Attach current active assignment for convenience
        $student->current_assignment = $student->studentAssignments
            ->whereNull('removed_date')
            ->first();

        return $this->successResponse($student, 'Student details retrieved');
    }

    /**
     * Update the specified student in storage.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $query = Student::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $student = $query->findOrFail($id);

        $validated = $request->validate([
            'student_name' => 'sometimes|required|string|max:255',
            'class'        => 'nullable|string|max:50',
            'section'      => 'nullable|string|max:50',
            'join_date'    => 'sometimes|required|date',
            'is_active'    => 'sometimes|required|boolean',
        ]);

        // Cannot change user_id after creation — ignore if sent
        $student->update($validated);

        return $this->successResponse($student, 'Student details updated');
    }

    /**
     * Remove the specified student from storage.
     */
    public function destroy($id): JsonResponse
    {
        $query = Student::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $student = $query->findOrFail($id);

        // If active assignment exists, close it
        $activeAssignment = StudentAssignment::where('student_id', $id)
            ->whereNull('removed_date')
            ->first();

        if ($activeAssignment) {
            $activeAssignment->update([
                'removed_date'   => today(),
                'removal_reason' => 'Student deleted from system.',
            ]);

            VehicleLog::create([
                'admin_id'       => $activeAssignment->admin_id,
                'vehicle_id'     => $activeAssignment->vehicle_id,
                'event_type'     => 'student_removed',
                'reference_id'   => $student->id,
                'reference_type' => 'student',
                'note'           => "Student '{$student->student_name}' was removed (student deleted).",
                'performed_by'   => auth()->id(),
            ]);
        }

        $student->delete();

        return $this->successResponse(null, 'Student deleted successfully');
    }

    /**
     * Assign student to a vehicle route.
     */
    public function assign(Request $request, $id): JsonResponse
    {
        $query = Student::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $student = $query->findOrFail($id);

        $request->validate([
            'vehicle_id'    => 'required|exists:vehicles,id',
            'monthly_fee'   => 'required|numeric|min:0',
            'assigned_date' => 'required|date',
            'reason'        => 'nullable|string|max:255',
        ]);

        // If student has active assignment, auto-close it
        $activeAssignment = StudentAssignment::where('student_id', $id)
            ->whereNull('removed_date')
            ->first();

        if ($activeAssignment) {
            $activeAssignment->update([
                'removed_date'   => today(),
                'removal_reason' => 'Transferred to new route',
            ]);

            VehicleLog::create([
                'admin_id'       => $activeAssignment->admin_id,
                'vehicle_id'     => $activeAssignment->vehicle_id,
                'event_type'     => 'student_removed',
                'reference_id'   => $student->id,
                'reference_type' => 'student',
                'note'           => "Student '{$student->student_name}' transferred to new route.",
                'performed_by'   => auth()->id(),
            ]);
        }

        // Create new assignment
        $assignment = StudentAssignment::create([
            'student_id'    => $student->id,
            'vehicle_id'    => $request->vehicle_id,
            'admin_id'      => auth()->id(),
            'monthly_fee'   => $request->monthly_fee,
            'assigned_date' => $request->assigned_date,
            'assigned_by'   => auth()->id(),
        ]);

        // Log the event
        VehicleLog::create([
            'admin_id'       => auth()->id(),
            'vehicle_id'     => $request->vehicle_id,
            'event_type'     => 'student_added',
            'reference_id'   => $student->id,
            'reference_type' => 'student',
            'note'           => "Student '{$student->student_name}' was assigned to this vehicle route.",
            'performed_by'   => auth()->id(),
        ]);

        $assignment->load(['student', 'vehicle']);

        return $this->successResponse($assignment, 'Student assigned to vehicle successfully');
    }

    /**
     * Remove the student from their active vehicle assignment.
     */
    public function remove(Request $request, $id): JsonResponse
    {
        $query = Student::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $student = $query->findOrFail($id);

        $request->validate([
            'removal_reason' => 'nullable|string|max:255',
        ]);

        $activeAssignment = StudentAssignment::where('student_id', $id)
            ->whereNull('removed_date')
            ->first();

        if (!$activeAssignment) {
            return $this->errorResponse('Student has no active bus assignment', 404);
        }

        $activeAssignment->update([
            'removed_date'   => today(),
            'removal_reason' => $request->removal_reason,
        ]);

        // Log the removal
        VehicleLog::create([
            'admin_id'       => $activeAssignment->admin_id,
            'vehicle_id'     => $activeAssignment->vehicle_id,
            'event_type'     => 'student_removed',
            'reference_id'   => $student->id,
            'reference_type' => 'student',
            'note'           => "Student '{$student->student_name}' was removed: " . ($request->removal_reason ?? 'No reason'),
            'performed_by'   => auth()->id(),
        ]);

        return $this->successResponse($activeAssignment, 'Student removed from route successfully');
    }

    /**
     * Get assignment history logs for student.
     */
    public function assignments($id): JsonResponse
    {
        $query = Student::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $student = $query->findOrFail($id);

        $assignments = $student->studentAssignments()
            ->with(['vehicle', 'assignedBy'])
            ->orderBy('assigned_date', 'desc')
            ->get();

        return $this->successResponse($assignments, 'Assignment history retrieved');
    }

    /**
     * Get dues for student.
     */
    public function dues($id): JsonResponse
    {
        $query = Student::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $student = $query->findOrFail($id);

        $dues = Due::where('reference_type', 'student')
            ->where('reference_id', $id)
            ->with('transaction')
            ->orderBy('due_for_month', 'desc')
            ->get();

        return $this->successResponse($dues, 'Student dues retrieved');
    }
}
