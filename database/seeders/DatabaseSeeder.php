<?php

namespace Database\Seeders;

use App\Models\Driver;
use App\Models\DriverAssignment;
use App\Models\Student;
use App\Models\StudentAssignment;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleLog;
use Carbon\Carbon;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // ─── 1. Create Super Admin ──────────────────────────────────────
        $superAdmin = User::create([
            'name'     => 'Super Admin',
            'phone'    => '9999999999',
            'email'    => 'superadmin@app.com',
            'password' => Hash::make('secret123'),
            'role'     => 'super_admin',
            'is_active' => true,
        ]);

        $this->command->info('✅ Super Admin created (superadmin@app.com / secret123)');

        // ─── 2. Create Sample Admin ─────────────────────────────────────
        $admin = User::create([
            'name'       => 'Sample Admin',
            'phone'      => '8888888888',
            'email'      => 'admin@app.com',
            'password'   => Hash::make('secret123'),
            'role'       => 'admin',
            'is_active'  => true,
            'created_by' => $superAdmin->id,
        ]);

        $this->command->info('✅ Admin created (admin@app.com / secret123)');

        // ─── 3. Create a Sample Parent User ─────────────────────────────
        $parentUser = User::create([
            'name'       => 'Sample Parent',
            'phone'      => '7777777777',
            'email'      => 'parent@app.com',
            'password'   => Hash::make('secret123'),
            'role'       => 'user',
            'is_active'  => true,
            'created_by' => $admin->id,
        ]);

        $this->command->info('✅ Parent user created (parent@app.com / secret123)');

        // ─── 4. Create a Sample Vehicle (Bus) ───────────────────────────
        $bus = Vehicle::create([
            'admin_id'  => $admin->id,
            'name'      => 'Bus Route 1',
            'type'      => 'bus',
            'wage_type' => 'monthly',
            'capacity'  => 40,
            'is_active' => true,
        ]);

        $this->command->info('✅ Vehicle created: Bus Route 1');

        // ─── 5. Create a Sample Driver & Assign to Bus ──────────────────
        $driver = Driver::create([
            'admin_id'       => $admin->id,
            'name'           => 'Raju Kumar',
            'phone'          => '6666666666',
            'license_number' => 'KA-01-DL-2024-001',
            'daily_wage'     => 800.00,
            'is_active'      => true,
        ]);

        $driverAssignment = DriverAssignment::create([
            'driver_id'     => $driver->id,
            'vehicle_id'    => $bus->id,
            'admin_id'      => $admin->id,
            'assigned_date' => Carbon::today(),
            'relieved_date' => null,
            'assigned_by'   => $admin->id,
        ]);

        // Log the driver assignment event
        VehicleLog::create([
            'admin_id'       => $admin->id,
            'vehicle_id'     => $bus->id,
            'event_type'     => 'driver_assigned',
            'reference_id'   => $driver->id,
            'reference_type' => 'driver',
            'note'           => 'Initial driver assignment via seeder',
            'performed_by'   => $admin->id,
        ]);

        $this->command->info('✅ Driver created & assigned: Raju Kumar → Bus Route 1');

        // ─── 6. Create a Sample Student & Assign to Bus ─────────────────
        $student = Student::create([
            'user_id'      => $parentUser->id,
            'admin_id'     => $admin->id,
            'student_name' => 'Amit Sharma',
            'class'        => '5th',
            'section'      => 'A',
            'join_date'    => Carbon::today(),
            'is_active'    => true,
        ]);

        $studentAssignment = StudentAssignment::create([
            'student_id'    => $student->id,
            'vehicle_id'    => $bus->id,
            'admin_id'      => $admin->id,
            'monthly_fee'   => 1500.00,
            'assigned_date' => Carbon::today(),
            'removed_date'  => null,
            'assigned_by'   => $admin->id,
        ]);

        // Log the student assignment event
        VehicleLog::create([
            'admin_id'       => $admin->id,
            'vehicle_id'     => $bus->id,
            'event_type'     => 'student_added',
            'reference_id'   => $student->id,
            'reference_type' => 'student',
            'note'           => 'Initial student assignment via seeder',
            'performed_by'   => $admin->id,
        ]);

        $this->command->info('✅ Student created & assigned: Amit Sharma → Bus Route 1');

        // ─── Done ───────────────────────────────────────────────────────
        $this->command->info('');
        $this->command->info('🚀 Database seeding completed successfully!');
        $this->command->info('   Super Admin: superadmin@app.com / secret123');
        $this->command->info('   Admin:       admin@app.com / secret123');
        $this->command->info('   Parent:      parent@app.com / secret123');
    }
}
