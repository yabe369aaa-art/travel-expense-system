"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // Clean up
    await prisma.applicationHistory.deleteMany();
    await prisma.detail.deleteMany();
    await prisma.application.deleteMany();
    await prisma.commuterPass.deleteMany();
    await prisma.user.deleteMany();
    // Create users
    const passwordHash = await bcryptjs_1.default.hash('password123', 12);
    const admin = await prisma.user.create({
        data: {
            email: 'admin@travel-expense.local',
            passwordHash,
            role: 'admin',
            authType: 'local',
        },
    });
    const coordinator = await prisma.user.create({
        data: {
            email: 'coordinator@travel-expense.local',
            passwordHash,
            role: 'coordinator',
            authType: 'local',
        },
    });
    const applicant1 = await prisma.user.create({
        data: {
            email: 'applicant1@travel-expense.local',
            passwordHash,
            role: 'applicant',
            authType: 'local',
        },
    });
    const applicant2 = await prisma.user.create({
        data: {
            email: 'applicant2@travel-expense.local',
            passwordHash,
            role: 'applicant',
            authType: 'local',
        },
    });
    // Entra ID user (mock)
    const entraUser = await prisma.user.create({
        data: {
            email: 'entra.user@company.com',
            role: 'applicant',
            authType: 'entra_id',
            entraObjectId: 'entra-object-id-12345',
        },
    });
    console.log('✅ Users created:', { admin: admin.email, coordinator: coordinator.email, applicant1: applicant1.email, applicant2: applicant2.email, entraUser: entraUser.email });
    // Create commuter passes
    await prisma.commuterPass.create({
        data: {
            userId: applicant1.id,
            routeText: '新宿 〜 渋谷',
            teikiProfile: 'EKISPERT_TEIKI_PROFILE_SERIALIZED_DATA_1',
            expiredAt: new Date('2026-03-31'),
        },
    });
    await prisma.commuterPass.create({
        data: {
            userId: applicant2.id,
            routeText: '東京 〜 品川',
            teikiProfile: 'EKISPERT_TEIKI_PROFILE_SERIALIZED_DATA_2',
            expiredAt: new Date('2026-03-31'),
        },
    });
    console.log('✅ Commuter passes created');
    // Create sample applications
    const draftApp = await prisma.application.create({
        data: {
            applicantId: applicant1.id,
            targetUserId: applicant1.id,
            title: '6月出張費用',
            status: 'draft',
            totalAmount: 0,
        },
    });
    const pendingApp = await prisma.application.create({
        data: {
            applicantId: applicant1.id,
            targetUserId: applicant1.id,
            title: '5月出張費用',
            status: 'pending',
            totalAmount: 15000,
        },
    });
    const approvedApp = await prisma.application.create({
        data: {
            applicantId: applicant2.id,
            targetUserId: applicant2.id,
            title: '4月出張費用',
            status: 'approved',
            totalAmount: 25000,
        },
    });
    const transferredApp = await prisma.application.create({
        data: {
            applicantId: applicant2.id,
            targetUserId: applicant2.id,
            title: '3月出張費用',
            status: 'transferred',
            totalAmount: 18000,
        },
    });
    // Create details for approved app (for history reuse)
    await prisma.detail.create({
        data: {
            applicationId: approvedApp.id,
            transportType: 'train',
            useDate: new Date('2026-04-15'),
            departurePlace: '新宿',
            arrivalPlace: '大阪',
            reimbursementFare: 14000,
            routeSerializeData: 'EKISPERT_ROUTE_SERIALIZE_DATA_SHINJUKU_OSAKA',
            purpose: '客先訪問',
        },
    });
    await prisma.detail.create({
        data: {
            applicationId: approvedApp.id,
            transportType: 'train',
            useDate: new Date('2026-04-16'),
            departurePlace: '大阪',
            arrivalPlace: '新宿',
            reimbursementFare: 14000,
            routeSerializeData: 'EKISPERT_ROUTE_SERIALIZE_DATA_OSAKA_SHINJUKU',
            purpose: '帰社',
        },
    });
    // Create details for transferred app
    await prisma.detail.create({
        data: {
            applicationId: transferredApp.id,
            transportType: 'plane',
            useDate: new Date('2026-03-10'),
            departurePlace: '羽田空港',
            arrivalPlace: '新千歳空港',
            reimbursementFare: 18000,
            receiptFileUrl: 'receipts/sample-receipt.pdf',
            purpose: '北海道出張',
        },
    });
    // Create details for draft app
    await prisma.detail.create({
        data: {
            applicationId: draftApp.id,
            transportType: 'train',
            useDate: new Date('2026-06-01'),
            departurePlace: '新宿',
            arrivalPlace: '渋谷',
            reimbursementFare: 200,
            routeSerializeData: 'EKISPERT_ROUTE_SERIALIZE_DATA_SHINJUKU_SHIBUYA',
            purpose: '社内会議',
        },
    });
    // Create history entries
    await prisma.applicationHistory.createMany({
        data: [
            { applicationId: pendingApp.id, operatorId: applicant1.id, action: 'submit' },
            { applicationId: approvedApp.id, operatorId: applicant2.id, action: 'submit' },
            { applicationId: approvedApp.id, operatorId: admin.id, action: 'approve' },
            { applicationId: transferredApp.id, operatorId: applicant2.id, action: 'submit' },
            { applicationId: transferredApp.id, operatorId: admin.id, action: 'approve' },
            { applicationId: transferredApp.id, operatorId: admin.id, action: 'transfer' },
        ],
    });
    console.log('✅ Sample applications and details created');
    console.log('🌱 Seeding completed!');
}
main()
    .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map