
import Navbar from '@/components/Navbar';
import FarmCreationForm from '@/components/farm/FarmCreationForm';

const NewFarmPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <FarmCreationForm />
    </div>
  );
};

export default NewFarmPage;
