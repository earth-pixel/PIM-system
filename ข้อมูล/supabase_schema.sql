-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    code TEXT,
    barcode TEXT,
    name TEXT,
    brand TEXT,
    category TEXT,
    "wholesalePrice" NUMERIC,
    "retailPrice" NUMERIC,
    "capFee" NUMERIC,
    description TEXT,
    highlights TEXT,
    "howToUse" TEXT,
    image TEXT,
    size TEXT,
    weight TEXT,
    "fdaNumber" TEXT,
    "tisiNumber" TEXT,
    stock INTEGER,
    status TEXT,
    "updatedAt" TEXT,
    "createdAt" TEXT,
    "updatedBy" TEXT
);

-- 2. Create Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name TEXT,
    logo TEXT,
    description TEXT,
    status TEXT,
    "createdAt" TEXT
);

-- 3. Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    status TEXT,
    "createdAt" TEXT
);

-- 4. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    password TEXT,
    name TEXT,
    role TEXT,
    status TEXT,
    "createdAt" TEXT
);

-- 5. Create Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY,
    "quotationNumber" TEXT,
    "documentType" TEXT,
    "issuedDate" TEXT,
    "validUntilDate" TEXT,
    customer JSONB,
    items JSONB,
    "vatRate" NUMERIC,
    status TEXT,
    note TEXT,
    subtotal NUMERIC,
    "vatAmount" NUMERIC,
    "totalAmount" NUMERIC,
    "approvedBy" TEXT,
    "approvedDate" TEXT,
    "createdBy" TEXT,
    "creatorRole" TEXT,
    "sourceProposalId" TEXT,
    "salespersonName" TEXT,
    "salespersonPhone" TEXT,
    "projectName" TEXT,
    "sentEmails" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- 6. Create Activity Log Table
CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    timestamp TEXT,
    "userName" TEXT,
    "userRole" TEXT,
    action TEXT
);

-- ── 7. Supabase Storage Setup (For Product Images & Brand Logos) ──
-- Run these statements in Supabase to create the bucket and configure access policies.

-- Create a storage bucket named 'products' for public access
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Set up Row-Level Security (RLS) policies for the storage bucket:

-- Policy 1: Allow anyone to view/read the files (Public Access)
CREATE POLICY "Allow Public Access to Products Bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

-- Policy 2: Allow authenticated users to upload files
CREATE POLICY "Allow Authenticated Users to Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

-- Policy 3: Allow authenticated users to update files
CREATE POLICY "Allow Authenticated Users to Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products');

-- Policy 4: Allow authenticated users to delete files
CREATE POLICY "Allow Authenticated Users to Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');
