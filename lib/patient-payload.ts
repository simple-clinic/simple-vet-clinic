import { z } from "zod";

const optionalNumber = z.union([z.number(), z.null()]).optional();

export const ownerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  email: z.string().trim().max(180).default(""),
  governorate: z.string().trim().max(80).default(""),
  area: z.string().trim().max(120).default(""),
});

export const patientSchema = z.object({
  name: z.string().trim().min(1).max(100),
  species: z.enum(["cat", "dog", "bird", "rabbit", "hamster"]),
  breed: z.string().trim().max(100).default(""),
  sex: z.string().trim().max(40).default("غير محدد"),
  ageValue: z.number().int().min(0).max(1200).nullable().optional(),
  ageUnit: z.string().trim().max(20).default("سنة"),
  birthDate: z.string().trim().max(20).nullable().optional(),
  color: z.string().trim().max(100).default(""),
  weightKg: optionalNumber,
  microchip: z.string().trim().max(100).default(""),
  reproductiveStatus: z.string().trim().max(60).default("غير محدد"),
  drugAllergies: z.string().trim().max(800).default("لا توجد حساسية معروفة"),
  sensitivityNotes: z.string().trim().max(1000).default(""),
});

export const patientProfileSchema = z.object({
  owner: ownerSchema,
  patient: patientSchema,
});
