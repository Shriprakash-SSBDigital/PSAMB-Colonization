# Colonization Project Instructions

## Overview
Colonization is a full-stack web application consisting of an ASP.NET Core 8 Web API backend and an Angular 21 frontend.

---

## Tech Stack & Architecture

### Backend (`/Backend`)
- **Framework:** .NET 8 (ASP.NET Core Web API)
- **Database / ORM:** SQL Server with Entity Framework Core (`ApplicationDbContext`)
- **Architecture Pattern:** Repository & Unit of Work pattern (`Repositories/Interfaces`, `Repositories/Implementations`), Business Service layer (`Services/Interfaces`, `Services/Implementations`), Controllers, and FluentValidation (`Validators/`).
- **Authentication & Security:** ASP.NET Core Identity, JWT Bearer Authentication (`AuthController`, `EmailVerificationController`, `MobileVerificationController`).
- **Reporting / Document Export:** QuestPDF (PDF generation), ClosedXML (Excel generation).
- **Logging & Diagnostics:** Serilog (`Serilog.AspNetCore`, `Serilog.Sinks.Seq`).

### Frontend (`/Frontend`)
- **Framework:** Angular 21 (`@angular/core`, `@angular/cli`, `@angular/router`, etc.)
- **UI Libraries & Styling:** PrimeNG, Angular Material, Bootstrap 5, Tailwind CSS, Sass (`styles.scss`).
- **Architecture:** Feature-based modular structure (`src/app/features/`, `core/`, `shared/`, `layouts/`, `models/`).
- **State & Reactive Programming:** RxJS.
- **Notifications:** `ngx-toastr`.

---

## Development & Build Commands

### Backend
- **Restore Dependencies:** `dotnet restore Backend/Backend.sln`
- **Build Solution:** `dotnet build Backend/Backend.sln`
- **Run API:** `dotnet run --project Backend/Backend.csproj`
- **EF Core Migrations:** `dotnet ef migrations add <MigrationName> --project Backend/Backend.csproj` / `dotnet ef database update --project Backend/Backend.csproj`

### Frontend
- **Install Dependencies:** `npm --prefix Frontend install`
- **Run Development Server:** `npm --prefix Frontend run start` (serves on `http://localhost:4200`)
- **Production Build:** `npm --prefix Frontend run build`
- **Run Unit Tests:** `npm --prefix Frontend run test`

---

## Coding Standards & Conventions
1. **Type Safety & Strictness:** Adhere strictly to TypeScript strict mode in Angular and nullable reference types in C# (`<Nullable>enable</Nullable>`). Never bypass type systems with casts or suppresses unless unavoidable.
2. **Layer Separation:** Keep Controllers thin by delegating business logic to Services and data access to Repositories/Unit of Work.
3. **Validation:** Use FluentValidation for backend request validation and Angular reactive forms / validators for frontend input validation.
4. **Error Handling:** Use centralized exception handling middleware on the backend (`ExceptionMiddleware`) and standardized API response wrappers (`ApiResponse`).
