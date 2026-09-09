/**
 * #500: Test query WhatsApp Broadcast dengan recipientIds array.
 * Mencegah regresi error PostgreSQL:
 * 'code: 22P02, malformed array literal'
 * saat recipientIds berisi 1 orang maupun banyak orang.
 */
// Mock pg agar test murni unit test string tanpa dangling network connection
jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    on: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn(),
  })),
}));

import { convertToPostgres } from "../../src/lib/db";
import fs from "node:fs";
import path from "node:path";

describe("#500: WhatsApp Broadcast recipientIds query", () => {
  it("whatsapp.service.ts menggunakan IN (?) dengan passing array recipientIds", () => {
    const servicePath = path.join(__dirname, "..", "services", "whatsapp.service.ts");
    const content = fs.readFileSync(servicePath, "utf8");

    // Memastikan tidak memakai mapping placeholder string join
    expect(content).not.toContain('recipientIds.map(() => "?").join');
    expect(content).not.toContain("...recipientIds, ...recipientIds");

    // Memastikan memakai pattern IN (?) dan params.push(recipientIds, ...)
    expect(content).toMatch(
      /query \+= ['"] AND \(id IN \(\?\) OR username IN \(\?\) OR uid IN \(\?\)\)['"];/
    );
    expect(content).toContain("params.push(recipientIds, recipientIds, recipientIds);");
  });

  it("convertToPostgres mengonversi IN (?) menjadi ANY(?) dan mempertahankan array parameter untuk Postgres", () => {
    const query =
      'SELECT id, "displayName", phone FROM "Users" WHERE phone IS NOT NULL AND (id IN (?) OR username IN (?) OR uid IN (?))';
    const singleRecipient = ["b173bce4-19a4-4ddb-9e06-e44cf847aeb7"];
    const params = [singleRecipient, singleRecipient, singleRecipient];

    const result = convertToPostgres(query, params);

    expect(result.text).toBe(
      'SELECT id, "displayName", phone FROM "Users" WHERE phone IS NOT NULL AND (id = ANY($1) OR username = ANY($2) OR uid = ANY($3))'
    );
    expect(result.values).toEqual([singleRecipient, singleRecipient, singleRecipient]);
    // Verifikasi parameter pertama adalah array, BUKAN scalar string (penyebab 22P02)
    expect(Array.isArray(result.values[0])).toBe(true);
    expect(result.values[0]).toHaveLength(1);
    expect(result.values[0][0]).toBe("b173bce4-19a4-4ddb-9e06-e44cf847aeb7");
  });

  it("bekerja sama baiknya saat banyak recipient dipilih", () => {
    const query =
      'SELECT id, "displayName", phone FROM "Users" WHERE phone IS NOT NULL AND (id IN (?) OR username IN (?) OR uid IN (?))';
    const multipleRecipients = ["uuid-1", "uuid-2", "uuid-3"];
    const params = [multipleRecipients, multipleRecipients, multipleRecipients];

    const result = convertToPostgres(query, params);

    expect(result.text).toContain("id = ANY($1) OR username = ANY($2) OR uid = ANY($3)");
    expect(result.values[0]).toEqual(["uuid-1", "uuid-2", "uuid-3"]);
  });
});
