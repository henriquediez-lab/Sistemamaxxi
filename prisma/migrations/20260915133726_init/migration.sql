-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MlAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "nickname" TEXT,
    "siteId" TEXT NOT NULL DEFAULT 'MLB',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'bearer',
    "scope" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mlAccountId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'em_andamento',
    "itemsSynced" INTEGER NOT NULL DEFAULT 0,
    "itemsTotal" INTEGER,
    "errorMessage" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "SyncLog_mlAccountId_fkey" FOREIGN KEY ("mlAccountId") REFERENCES "MlAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Anuncio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mlAccountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "permalink" TEXT,
    "thumbnail" TEXT,
    "price" REAL NOT NULL,
    "currencyId" TEXT NOT NULL DEFAULT 'BRL',
    "availableQuantity" INTEGER NOT NULL DEFAULT 0,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "condition" TEXT,
    "listingTypeId" TEXT,
    "categoryId" TEXT,
    "catalogListing" BOOLEAN NOT NULL DEFAULT false,
    "healthScore" REAL,
    "mlDateCreated" DATETIME,
    "mlLastUpdated" DATETIME,
    "lastSyncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Anuncio_mlAccountId_fkey" FOREIGN KEY ("mlAccountId") REFERENCES "MlAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MlAccount_sellerId_key" ON "MlAccount"("sellerId");

-- CreateIndex
CREATE INDEX "Anuncio_mlAccountId_idx" ON "Anuncio"("mlAccountId");

-- CreateIndex
CREATE INDEX "Anuncio_status_idx" ON "Anuncio"("status");
