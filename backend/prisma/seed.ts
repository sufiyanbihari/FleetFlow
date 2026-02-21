import 'dotenv/config';
import { UserRole, VehicleStatus, DriverStatus, TripStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Respect an existing DATABASE_URL; only fall back to the sample Neon URL if none provided.
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_RGH0IBftan6k@ep-shiny-scene-a1bz9wxp-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&pgbouncer=true';
}

let app: any;

async function main() {
    console.log('Bootstrapping NestJS for seeding context...');
    app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);

    console.log('Clearing database...');
    // Clear all existing data in reverse order of relations
    await prisma.auditLog.deleteMany();
    await prisma.fuelLog.deleteMany();
    await prisma.maintenanceLog.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.driver.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.user.deleteMany();

    console.log('Seeding Users...');
    const passwordHash = await bcrypt.hash('fleetadmin123', 10);

    // Create an admin for each role to allow testing the dashboard with different RBAC
    const roles = [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.SAFETY, UserRole.FINANCE];

    for (const role of roles) {
        await prisma.user.create({
            data: {
                name: `${role} User`,
                email: `${role.toLowerCase()}@fleetflow.com`,
                passwordHash,
                role: role,
            }
        });
    }

    console.log('Seeding Vehicles (10)...');
    const models = ['F-150', 'Cascadia', 'VNL 860', 'Model 579', 'T680'];
    const vehicles = [];

    for (let i = 0; i < 10; i++) {
        const v = await prisma.vehicle.create({
            data: {
                name: `Truck ${i + 1}`,
                model: models[i % models.length],
                licensePlate: `XYZ-${100 + i}`,
                maxCapacityKg: 40000,
                odometer: Math.floor(Math.random() * 50000) + 10000,
                acquisitionCost: 150000 + (Math.random() * 50000),
                status: i === 9 ? VehicleStatus.IN_SHOP : VehicleStatus.AVAILABLE,
            }
        });
        vehicles.push(v);
    }

    console.log('Seeding Drivers (15)...');
    const drivers = [];
    for (let i = 0; i < 15; i++) {
        const expired = i === 14;
        const d = await prisma.driver.create({
            data: {
                name: `Driver ${i + 1} ${['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'][i % 5]}`,
                licenseNumber: `DL-${100000 + i}`,
                licenseCategory: 'CDL-A',
                licenseExpiry: expired ? new Date(Date.now() - 86400000 * 30) : new Date(Date.now() + 86400000 * 365),
                // Keep one suspended driver to test expiry handling; others are on duty so the UI can dispatch immediately.
                status: expired ? DriverStatus.SUSPENDED : DriverStatus.ON_DUTY,
                safetyScore: expired ? 45 : Math.floor(Math.random() * 20) + 80,
            }
        });
        drivers.push(d);
    }

    console.log('Seeding Trips & Logs (50)...');
    const locations = ['Atlanta, GA', 'Dallas, TX', 'Chicago, IL', 'Los Angeles, CA', 'New York, NY', 'Miami, FL', 'Seattle, WA', 'Denver, CO'];

    for (let i = 0; i < 50; i++) {
        const v = vehicles[Math.floor(Math.random() * vehicles.length)];
        const d = drivers[Math.floor(Math.random() * (drivers.length - 1))]; // Ignore the suspended one

        const isCompleted = i < 40;
        const isDispatched = i >= 40 && i < 48;
        const isDraft = i >= 48;

        let status: TripStatus = TripStatus.COMPLETED;
        if (isDispatched) status = TripStatus.DISPATCHED;
        if (isDraft) status = TripStatus.DRAFT;

        const startLoc = locations[Math.floor(Math.random() * locations.length)];
        let endLoc = locations[Math.floor(Math.random() * locations.length)];
        if (startLoc === endLoc) endLoc = locations[(locations.indexOf(startLoc) + 1) % locations.length];

        const distance = Math.floor(Math.random() * 1500) + 200;

        // Distribute creation dates over the last 30 days
        const pastDays = Math.floor(Math.random() * 30);
        const tripDate = new Date();
        tripDate.setHours(0, 0, 0, 0);
        tripDate.setDate(tripDate.getDate() - pastDays);

        const trip = await prisma.trip.create({
            data: {
                vehicleId: v.id,
                driverId: d.id,
                cargoWeight: Math.floor(Math.random() * 30000) + 5000,
                origin: startLoc,
                destination: endLoc,
                revenue: distance * 2.5, // $2.50 per mile/km
                startOdometer: v.odometer - distance,
                endOdometer: isCompleted ? v.odometer : null,
                distanceKm: isCompleted ? distance : null,
                status: status,
                createdAt: tripDate,
                completedAt: isCompleted ? new Date(tripDate.getTime() + 86400000 * (Math.random() * 2 + 1)) : null,
            }
        });

        if (isCompleted) {
            // Create a fuel log for completed trips
            await prisma.fuelLog.create({
                data: {
                    vehicleId: v.id,
                    tripId: trip.id,
                    liters: distance / 3.5, // Approx 3.5 km/L
                    cost: (distance / 3.5) * 1.8, // Approx $1.8/L
                    date: tripDate,
                }
            });
        }
    }

    console.log('Seeding Maintenance Logs...');
    for (let i = 0; i < 5; i++) {
        await prisma.maintenanceLog.create({
            data: {
                vehicleId: vehicles[i].id,
                type: 'ROUTINE',
                cost: 250 + Math.random() * 500,
                description: 'Standard oil change and brake inspection',
                serviceDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000),
            }
        });
    }

    console.log('Database seeded successfully!');
    console.log('Test Accounts created:');
    roles.forEach(role => console.log(`- ${role.toLowerCase()}@fleetflow.com / fleetadmin123`));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        if (app) {
            await app.close();
        }
    });
