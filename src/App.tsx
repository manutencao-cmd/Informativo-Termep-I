import { useState } from 'react';
import { ServiceForm } from './components/ServiceForm';
import { ReceiptPreview } from './components/ReceiptPreview';

export default function App() {
  const [submittedData, setSubmittedData] = useState<any>(null);

  return (
    <main className="w-full flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-2xl">
        {!submittedData ? (
          <ServiceForm onSuccess={setSubmittedData} />
        ) : (
          <ReceiptPreview
            data={submittedData}
            onBack={() => setSubmittedData(null)}
          />
        )}
      </div>
    </main>
  );
}
