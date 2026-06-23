# TransitFlow — Transport Management SaaS

TransitFlow is a modern Transport Management Software-as-a-Service (SaaS) application built on Laravel. It enables transport operators to manage fleets, routes, drivers on daily wages, students on monthly school bus plans, auto passenger daily fares, transactions, dues tracking, WhatsApp payment notifications, and vehicle audit logs.

---

## Key Features

1. **Autos**: Managed on a **daily wage** structure (drivers get paid per day worked) and daily fares for passengers.
2. **School Buses**: Managed on a **monthly fee** structure (students pay a fixed monthly fare).
3. **Multi-Role Access Control**:
   - **Super Admin**: Complete platform ownership and visibility.
   - **Admin**: Fleet owners who manage their own vehicles, drivers, users, and settings.
   - **User**: Parents (for student bus status) or passengers/workers.
4. **Driver & Student Vehicle Assignments**: Dynamic history-tracking tables for vehicle assignment logs rather than direct hardcoding.
5. **Transactions & Dues**: Complete payment logs and auto-generated dues tracking.
6. **WhatsApp Integration Logs**: WhatsApp notification statuses (pending, sent, failed) for confirmations.
7. **Vehicle Logs**: Automated audit trail tracking all major changes (driver assignment/relieving, student addition/removal, activation/deactivation, etc.).

---

## Technology Stack

- **Backend Framework**: [Laravel 13.x](https://laravel.com)
- **Database**: MySQL / PostgreSQL / SQLite
- **Environment**: PHP 8.3+

---

## Database Schema & Models

TransitFlow contains the following database tables and corresponding Eloquent models:

- `users` — `User`
- `vehicles` — `Vehicle`
- `drivers` — `Driver`
- `students` — `Student`
- `auto_passengers` — `AutoPassenger`
- `driver_assignments` — `DriverAssignment`
- `student_assignments` — `StudentAssignment`
- `transactions` — `Transaction`
- `dues` — `Due`
- `whatsapp_logs` — `WhatsappLog`
- `admin_settings` — `AdminSetting`
- `vehicle_logs` — `VehicleLog`

---

## Setup Instructions

### 1. Configure Environment
Clone the repository and copy the environment file:
```bash
cp .env.example .env
```
Configure your database credentials in `.env`.

### 2. Install Dependencies
```bash
composer install
npm install
```

### 3. Generate App Key & Migrate
```bash
php artisan key:generate
php artisan migrate --seed
```

This will run all database migrations and seed the application with a Super Admin (`superadmin@app.com`), a sample Admin (`admin@app.com`), and parent user accounts, as well as a pre-configured sample vehicle route, driver, student, and corresponding assignment logs.
