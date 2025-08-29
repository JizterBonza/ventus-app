import React, { useState } from 'react';
import { testApiConnectivity, testSampleUrl, testApiEndpoint } from '../utils/api';

const ApiTest: React.FC = () => {
  const [results, setResults] = useState<Array<{ name: string; result: any; timestamp: Date }>>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (name: string, result: any) => {
    setResults(prev => [...prev, { name, result, timestamp: new Date() }]);
  };

  const runAllTests = async () => {
    setLoading(true);
    setResults([]);

    try {
      // Test 1: Basic connectivity
      console.log('Testing basic API connectivity...');
      const connectivityResult = await testApiConnectivity();
      addResult('Basic Connectivity', connectivityResult);

      // Test 2: Sample URL
      console.log('Testing sample URL...');
      const sampleResult = await testSampleUrl();
      addResult('Sample URL Test', sampleResult);

      // Test 3: API endpoint
      console.log('Testing API endpoint...');
      const endpointResult = await testApiEndpoint();
      addResult('API Endpoint Test', endpointResult);

    } catch (error) {
      addResult('Test Suite Error', { success: false, message: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <h2>API Connectivity Test</h2>
          <p className="text-muted">
            Environment: <strong>{process.env.NODE_ENV}</strong>
          </p>
          
          <div className="mb-3">
            <button 
              className="btn btn-primary me-2" 
              onClick={runAllTests}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Running Tests...
                </>
              ) : (
                <>
                  <i className="fa fa-play me-2"></i>
                  Run All Tests
                </>
              )}
            </button>
            <button 
              className="btn btn-outline-secondary" 
              onClick={clearResults}
              disabled={loading}
            >
              <i className="fa fa-trash me-2"></i>
              Clear Results
            </button>
          </div>

          {results.length > 0 && (
            <div className="results-container">
              <h4>Test Results</h4>
              {results.map((test, index) => (
                <div key={index} className={`alert ${test.result.success ? 'alert-success' : 'alert-danger'} mb-3`}>
                  <h5>
                    <i className={`fa ${test.result.success ? 'fa-check-circle' : 'fa-times-circle'} me-2`}></i>
                    {test.name}
                  </h5>
                  <p><strong>Status:</strong> {test.result.success ? 'Success' : 'Failed'}</p>
                  <p><strong>Message:</strong> {test.result.message}</p>
                  {test.result.data && (
                    <details>
                      <summary>Response Data</summary>
                      <pre className="mt-2 p-2 bg-light rounded">
                        {JSON.stringify(test.result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                  <small className="text-muted">
                    Tested at: {test.timestamp.toLocaleTimeString()}
                  </small>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <h4>Environment Information</h4>
            <div className="row">
              <div className="col-md-6">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">Build Environment</h5>
                    <ul className="list-unstyled">
                      <li><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</li>
                      <li><strong>Build Time:</strong> {process.env.REACT_APP_BUILD_TIME || 'Unknown'}</li>
                      <li><strong>Version:</strong> {process.env.REACT_APP_VERSION || 'Unknown'}</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">Browser Information</h5>
                    <ul className="list-unstyled">
                      <li><strong>User Agent:</strong> {navigator.userAgent}</li>
                      <li><strong>Platform:</strong> {navigator.platform}</li>
                      <li><strong>Language:</strong> {navigator.language}</li>
                      <li><strong>Online:</strong> {navigator.onLine ? 'Yes' : 'No'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiTest;
