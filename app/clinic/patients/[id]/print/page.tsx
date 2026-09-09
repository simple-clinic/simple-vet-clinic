import { PrintRecord } from "./print-record";

export default async function PrintPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PrintRecord patientId={id} />;
}
