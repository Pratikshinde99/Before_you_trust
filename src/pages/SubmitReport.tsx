import { Layout } from '@/components/layout/Layout';
import { IncidentForm } from '@/components/incident/IncidentForm';

const SubmitReport = () => {
  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <IncidentForm />
      </div>
    </Layout>
  );
};

export default SubmitReport;
