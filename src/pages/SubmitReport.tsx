import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { IncidentForm } from '@/components/incident/IncidentForm';
import { EntityType } from '@/types';

const SubmitReport = () => {
  const [searchParams] = useSearchParams();
  
  const entityId = searchParams.get('entity') || undefined;
  const entityName = searchParams.get('name') || undefined;
  const entityType = (searchParams.get('type') as EntityType) || undefined;
  const entityIdentifier = searchParams.get('identifier') || undefined;

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <IncidentForm
          prefilledEntityId={entityId}
          prefilledEntityName={entityName}
          prefilledEntityType={entityType}
          prefilledEntityIdentifier={entityIdentifier}
        />
      </div>
    </Layout>
  );
};

export default SubmitReport;
