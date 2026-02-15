import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { Work } from '@/lib/types';

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'library.json');

// Ensure directory exists
const ensureDir = async () => {
    const dir = path.dirname(dataFilePath);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
};

export async function GET() {
    try {
        await ensureDir();
        const fileContent = await fs.readFile(dataFilePath, 'utf-8');
        const data = JSON.parse(fileContent);
        return NextResponse.json(data);
    } catch (error) {
        // If file doesn't exist, return empty
        return NextResponse.json({ works: [] });
    }
}

export async function POST(request: Request) {
    try {
        await ensureDir();
        const body = await request.json();
        const works: Work[] = body.works;

        if (!Array.isArray(works)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        await fs.writeFile(dataFilePath, JSON.stringify({ works }, null, 2), 'utf-8');
        return NextResponse.json({ success: true, count: works.length });
    } catch (error) {
        console.error('Error saving library:', error);
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
