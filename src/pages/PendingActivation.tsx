const PendingActivation = () => {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-8 bg-white shadow-lg rounded-lg max-w-md">
          <h2 className="text-2xl font-semibold mb-4">Account Pending Activation</h2>
          <p>Your account is currently pending activation. Please wait for an admin to approve your access.</p>
        </div>
      </div>
    );
  };
  
  export default PendingActivation;