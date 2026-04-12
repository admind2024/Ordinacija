import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Payment, Appointment, PaymentMethod } from '../types';
import { useCalendar } from './CalendarContext';
import { supabase } from '../lib/supabase';

interface BillingContextType {
  payments: Payment[];
  appointments: Appointment[];
  addPayment: (payment: Payment) => void;
  getPaymentsForAppointment: (appointmentId: string) => Payment[];
  getAppointmentBalance: (appointment: Appointment) => { total: number; paid: number; remaining: number };
  getRecentPayments: (limit?: number) => (Payment & { appointment?: Appointment })[];
  getTotalRevenue: () => number;
  getRevenueByMethod: () => Record<PaymentMethod, number>;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export function BillingProvider({ children }: { children: ReactNode }) {
  const { appointments } = useCalendar();
  const [payments, setPayments] = useState<Payment[]>([]);

  // Ucitaj uplate iz baze na mount
  useEffect(() => {
    supabase
      .from('payments')
      .select('*')
      .order('datum', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPayments(data.map((p: any) => ({
            id: p.id,
            appointment_id: p.appointment_id,
            iznos: Number(p.iznos),
            metoda: p.metoda,
            napomena: p.napomena,
            datum: p.datum,
            fiskalni_status: p.fiskalni_status,
          })));
        }
      });
  }, []);

  const addPayment = useCallback(async (payment: Payment) => {
    // Snimi u bazu
    const { data, error } = await supabase.from('payments').insert({
      appointment_id: payment.appointment_id,
      iznos: payment.iznos,
      metoda: payment.metoda,
      napomena: payment.napomena || null,
      datum: payment.datum,
      fiskalni_status: payment.fiskalni_status || null,
    }).select().single();

    if (error) {
      console.error('Greska pri snimanju uplate:', error);
    }

    // Dodaj u lokalni state (sa ID-jem iz baze ako je uspjelo)
    const saved = data ? { ...payment, id: data.id } : payment;
    setPayments((prev) => [...prev, saved]);
  }, []);

  const getPaymentsForAppointment = useCallback(
    (appointmentId: string) => payments.filter((p) => p.appointment_id === appointmentId),
    [payments]
  );

  const getAppointmentBalance = useCallback(
    (appointment: Appointment) => {
      const total = appointment.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0;
      const paid = payments
        .filter((p) => p.appointment_id === appointment.id)
        .reduce((s, p) => s + p.iznos, 0);
      return { total, paid, remaining: total - paid };
    },
    [payments]
  );

  const getRecentPayments = useCallback(
    (limit = 50) => {
      return payments
        .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
        .slice(0, limit)
        .map((p) => ({
          ...p,
          appointment: appointments.find((a) => a.id === p.appointment_id),
        }));
    },
    [payments, appointments]
  );

  const getTotalRevenue = useCallback(
    () => payments.reduce((s, p) => s + p.iznos, 0),
    [payments]
  );

  const getRevenueByMethod = useCallback(() => {
    const result: Record<string, number> = {};
    payments.forEach((p) => {
      result[p.metoda] = (result[p.metoda] || 0) + p.iznos;
    });
    return result as Record<PaymentMethod, number>;
  }, [payments]);

  return (
    <BillingContext.Provider
      value={{
        payments, appointments, addPayment,
        getPaymentsForAppointment, getAppointmentBalance,
        getRecentPayments, getTotalRevenue, getRevenueByMethod,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (!context) throw new Error('useBilling mora biti koristen unutar BillingProvider-a');
  return context;
}
