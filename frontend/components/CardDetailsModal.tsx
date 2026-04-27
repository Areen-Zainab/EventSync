"use client";

import { useState } from "react";
import type { PlanName } from "@/lib/pricingPlans";

type CardDetailsModalProps = {
  open: boolean;
  planName: PlanName | null;
  onClose: () => void;
  onConfirm: (cardDetails: {
    cardholderName: string;
    cardNumber: string;
    expiry: string;
    cvv: string;
  }) => void;
};

export default function CardDetailsModal({ open, planName, onClose, onConfirm }: CardDetailsModalProps) {
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [error, setError] = useState("");

  if (!open || !planName) {
    return null;
  }

  const handleConfirm = () => {
    if (!cardholderName.trim() || !cardNumber.trim() || !expiry.trim() || !cvv.trim()) {
      setError("Please fill in all card details.");
      return;
    }

    setError("");
    onConfirm({
      cardholderName: cardholderName.trim(),
      cardNumber: cardNumber.trim(),
      expiry: expiry.trim(),
      cvv: cvv.trim(),
    });

    setCardholderName("");
    setCardNumber("");
    setExpiry("");
    setCvv("");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="card" style={{ width: "100%", maxWidth: 480, padding: 20 }}>
        <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: "1.2rem", fontWeight: 800, color: "var(--text-1)", marginBottom: 8 }}>
          Enter Card Details
        </h3>
        <p style={{ color: "var(--text-2)", fontSize: "0.85rem", marginBottom: 14 }}>
          Plan selected: {planName}. This form only collects details for UI flow and does not charge your card.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="input" placeholder="Cardholder name" value={cardholderName} onChange={(event) => setCardholderName(event.target.value)} />
          <input className="input" placeholder="Card number" value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input className="input" placeholder="MM/YY" value={expiry} onChange={(event) => setExpiry(event.target.value)} />
            <input className="input" placeholder="CVV" value={cvv} onChange={(event) => setCvv(event.target.value)} />
          </div>
        </div>

        {error && <p style={{ color: "var(--overdue)", fontSize: "0.8rem", marginTop: 10, marginBottom: 0 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={handleConfirm}>Submit Card Details</button>
        </div>
      </div>
    </div>
  );
}