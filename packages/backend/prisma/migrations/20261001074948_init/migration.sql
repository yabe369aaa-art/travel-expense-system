-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "authType" TEXT NOT NULL DEFAULT 'local',
    "passwordHash" TEXT,
    "entraObjectId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'applicant',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_commuter_passes" (
    "userId" TEXT NOT NULL,
    "routeText" TEXT,
    "teikiProfile" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_commuter_passes_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "expense_applications" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_application_details" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "transportType" TEXT NOT NULL,
    "useDate" TIMESTAMP(3) NOT NULL,
    "departurePlace" TEXT NOT NULL,
    "arrivalPlace" TEXT NOT NULL,
    "reimbursementFare" INTEGER NOT NULL,
    "routeSerializeData" TEXT,
    "gpsDistanceKm" DOUBLE PRECISION,
    "receiptFileUrl" TEXT,
    "purpose" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_application_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_histories" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_entraObjectId_key" ON "users"("entraObjectId");

-- CreateIndex
CREATE INDEX "expense_applications_applicantId_idx" ON "expense_applications"("applicantId");

-- CreateIndex
CREATE INDEX "expense_applications_targetUserId_idx" ON "expense_applications"("targetUserId");

-- CreateIndex
CREATE INDEX "expense_applications_status_idx" ON "expense_applications"("status");

-- CreateIndex
CREATE INDEX "expense_application_details_applicationId_idx" ON "expense_application_details"("applicationId");

-- CreateIndex
CREATE INDEX "expense_application_details_departurePlace_arrivalPlace_tra_idx" ON "expense_application_details"("departurePlace", "arrivalPlace", "transportType");

-- CreateIndex
CREATE INDEX "application_histories_applicationId_idx" ON "application_histories"("applicationId");

-- AddForeignKey
ALTER TABLE "user_commuter_passes" ADD CONSTRAINT "user_commuter_passes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_applications" ADD CONSTRAINT "expense_applications_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_applications" ADD CONSTRAINT "expense_applications_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_application_details" ADD CONSTRAINT "expense_application_details_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "expense_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_histories" ADD CONSTRAINT "application_histories_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "expense_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_histories" ADD CONSTRAINT "application_histories_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
