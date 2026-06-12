"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getObjectByApi, getFields, getValidationRules } from "@/lib/metadata";
import { Icon } from "@/lib/icons";
import RecordForm from "@/components/RecordForm";
import type { SfObject, SfField, SfValidationRule } from "@/lib/types";

export default function NewRecordPage() {
  const params = useParams();
  const router = useRouter();
  const api = String(params.object);
  const [object, setObject] = useState<SfObject | null>(null);
  const [fields, setFields] = useState<SfField[]>([]);
  const [rules, setRules] = useState<SfValidationRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const o = await getObjectByApi(api);
      if (!o) { setLoading(false); return; }
      const [f, r] = await Promise.all([getFields(o.id), getValidationRules(o.id)]);
      setObject(o);
      setFields(f);
      setRules(r);
      setLoading(false);
    })();
  }, [api]);

  if (loading) return <div className="center-screen" style={{ minHeight: "60vh" }}><div className="spinner" /></div>;
  if (!object) return <div className="page"><div className="empty-state">Object not found.</div></div>;

  return (
    <div className="page">
      <div className="record-header">
        <button className="btn-icon" onClick={() => router.back()}><Icon name="ArrowLeft" /></button>
        <span className="record-icon" style={{ background: "var(--sf-blue)" }}><Icon name={object.icon} size={20} /></span>
        <div>
          <div className="eyebrow">{object.label}</div>
          <h1>New {object.label}</h1>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <RecordForm object={object} fields={fields} rules={rules} onClose={() => router.push(`/o/${object.api_name}`)} />
        </div>
      </div>
    </div>
  );
}
