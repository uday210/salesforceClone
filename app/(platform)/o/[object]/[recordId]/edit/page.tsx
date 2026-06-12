"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getObjectByApi, getFields, getValidationRules } from "@/lib/metadata";
import { getRecord } from "@/lib/records";
import { Icon } from "@/lib/icons";
import RecordForm from "@/components/RecordForm";
import type { SfObject, SfField, SfValidationRule, SfRecord } from "@/lib/types";

export default function EditRecordPage() {
  const params = useParams();
  const router = useRouter();
  const api = String(params.object);
  const recordId = String(params.recordId);
  const [object, setObject] = useState<SfObject | null>(null);
  const [fields, setFields] = useState<SfField[]>([]);
  const [rules, setRules] = useState<SfValidationRule[]>([]);
  const [record, setRecord] = useState<SfRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const o = await getObjectByApi(api);
      if (!o) { setLoading(false); return; }
      const [f, r, rec] = await Promise.all([getFields(o.id), getValidationRules(o.id), getRecord(recordId)]);
      setObject(o); setFields(f); setRules(r); setRecord(rec);
      setLoading(false);
    })();
  }, [api, recordId]);

  if (loading) return <div className="center-screen" style={{ minHeight: "60vh" }}><div className="spinner" /></div>;
  if (!object || !record) return <div className="page"><div className="empty-state">Record not found.</div></div>;

  return (
    <div className="page">
      <div className="record-header">
        <button className="btn-icon" onClick={() => router.back()}><Icon name="ArrowLeft" /></button>
        <span className="record-icon" style={{ background: "var(--sf-blue)" }}><Icon name={object.icon} size={20} /></span>
        <div>
          <div className="eyebrow">{object.label}</div>
          <h1>Edit {record.name}</h1>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <RecordForm object={object} fields={fields} rules={rules} record={record} onClose={() => router.push(`/o/${api}/${recordId}`)} />
        </div>
      </div>
    </div>
  );
}
