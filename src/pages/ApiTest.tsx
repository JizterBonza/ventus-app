import React, { useState } from 'react';
import { getHotelDetails, testApiConnectivity } from '../utils/api';

const ApiTest: React.FC = () => {
  const [hotelId, setHotelId] = useState('1');
  const [hotelData, setHotelData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectivityTest, setConnectivityTest] = useState<any>(null);

  const testConnectivity = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await testApiConnectivity();
      setConnectivityTest(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connectivity test failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchHotelDetails = async () => {
    if (!hotelId) {
      setError('Please enter a hotel ID');
      return;
    }

    setLoading(true);
    setError(null);
    setHotelData(null);

    try {
      const data = await getHotelDetails(parseInt(hotelId));
      setHotelData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch hotel details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <h1>API Integration Test</h1>
      
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Test API Connectivity</h5>
            </div>
            <div className="card-body">
              <button 
                className="btn btn-primary" 
                onClick={testConnectivity}
                disabled={loading}
              >
                {loading ? 'Testing...' : 'Test Connectivity'}
              </button>
              
              {connectivityTest && (
                <div className="mt-3">
                  <div className={`alert ${connectivityTest.success ? 'alert-success' : 'alert-danger'}`}>
                    <strong>Result:</strong> {connectivityTest.message}
                  </div>
                  {connectivityTest.data && (
                    <details>
                      <summary>Response Data</summary>
                      <pre className="mt-2">{JSON.stringify(connectivityTest.data, null, 2)}</pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Test Hotel Details API</h5>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>Hotel ID:</label>
                <input
                  type="number"
                  className="form-control"
                  value={hotelId}
                  onChange={(e) => setHotelId(e.target.value)}
                  placeholder="Enter hotel ID"
                />
              </div>
              
              <button 
                className="btn btn-primary mt-2" 
                onClick={fetchHotelDetails}
                disabled={loading}
              >
                {loading ? 'Fetching...' : 'Fetch Hotel Details'}
              </button>
              
              {error && (
                <div className="alert alert-danger mt-3">
                  <strong>Error:</strong> {error}
                </div>
              )}
              
              {hotelData && (
                <div className="mt-3">
                  <div className="alert alert-success">
                    <strong>Success!</strong> Hotel details fetched successfully.
                  </div>
                  <details>
                    <summary>Hotel Data</summary>
                    <pre className="mt-2">{JSON.stringify(hotelData, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5>API Information</h5>
            </div>
            <div className="card-body">
              <p><strong>Base URL:</strong> https://api-staging.littleemperors.com/v2</p>
              <p><strong>Hotel Details Endpoint:</strong> /hotels/{'{hotel_id}'}</p>
              <p><strong>Search Endpoint:</strong> /search</p>
              <p><strong>Authentication:</strong> Bearer Token</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiTest;
