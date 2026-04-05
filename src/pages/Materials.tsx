import { Package } from 'lucide-react';
import Card from '../components/ui/Card';

export default function Materials() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Materijali</h2>
        <p className="text-sm text-gray-500 mt-1">Zalihe, utrosak i inventura</p>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Package size={48} className="mb-4" />
          <p className="text-lg font-medium">Modul materijala</p>
          <p className="text-sm mt-1">Katalog, utrosak po tretmanu, alarm zaliha — u izradi</p>
        </div>
      </Card>
    </div>
  );
}
