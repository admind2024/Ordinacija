import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Payment, Appointment, PaymentMethod } from '../types';
import { useCalendar } from './CalendarContext';

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

  const addPayment = useCallback((payment: Payment) => {
    setPayments((prev) => [...prev, payment]);
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
