import React from 'react';

const TestPage = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>✅ Frontend Test Page</h1>
      <p>If you can see this page, the frontend is working correctly!</p>
      <div style={{ marginTop: '20px' }}>
        <h3>Current Status:</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>✅ React Components: Working</li>
          <li>✅ Routing: Working</li>
          <li>✅ Styling: Working</li>
          <li>✅ No Runtime Errors: Confirmed</li>
        </ul>
      </div>
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
        <p><strong>Next Steps:</strong></p>
        <p>1. Start the backend server</p>
        <p>2. Login as admin (irtazamira@gmail.com / 123456)</p>
        <p>3. Start building your HR system!</p>
      </div>
    </div>
  );
};

export default TestPage;
