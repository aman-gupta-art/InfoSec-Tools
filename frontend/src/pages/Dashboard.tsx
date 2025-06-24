import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { serverApi } from '../services/api.js';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface DashboardStats {
  totalServers: number;
  statusCounts: {
    live: number;
    shutdown: number;
    new: number;
  };
  applicationOwnerStats: { applicationOwner: string; count: string }[];
  locationStats: { location: string; count: string }[];
  applicationNameStats: { applicationName: string; count: string }[];
  operatingSystemStats: { operatingSystem: string; count: string }[];
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const response = await serverApi.getDashboardStats();
        setStats(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        
        // Initialize with empty data if API fails
        setStats({
          totalServers: 0,
          statusCounts: {
            live: 0,
            shutdown: 0,
            new: 0
          },
          applicationOwnerStats: [],
          locationStats: [],
          applicationNameStats: [],
          operatingSystemStats: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  // Limit data to top 10 for each chart
  const limitToTop10 = (data: any[]) => data.slice(0, 10);

  // Prepare chart data - limiting to top 10
  const applicationOwnerData = {
    labels: stats ? limitToTop10(stats.applicationOwnerStats).map(item => item.applicationOwner) : [],
    datasets: [
      {
        label: 'Servers by Application Owner',
        data: stats ? limitToTop10(stats.applicationOwnerStats).map(item => Number(item.count)) : [],
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1,
      },
    ],
  };

  const locationData = {
    labels: stats ? limitToTop10(stats.locationStats).map(item => item.location) : [],
    datasets: [
      {
        label: 'Servers by Location',
        data: stats ? limitToTop10(stats.locationStats).map(item => Number(item.count)) : [],
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
      },
    ],
  };

  const applicationNameData = {
    labels: stats ? limitToTop10(stats.applicationNameStats).map(item => item.applicationName) : [],
    datasets: [
      {
        label: 'Servers by Application',
        data: stats ? limitToTop10(stats.applicationNameStats).map(item => Number(item.count)) : [],
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  const osData = {
    labels: stats ? limitToTop10(stats.operatingSystemStats).map(item => item.operatingSystem) : [],
    datasets: [
      {
        label: 'Servers by OS',
        data: stats ? limitToTop10(stats.operatingSystemStats).map(item => Number(item.count)) : [],
        backgroundColor: 'rgba(249, 115, 22, 0.6)',
        borderColor: 'rgb(249, 115, 22)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 15
        }
      },
      title: {
        display: true,
        text: 'Top 10 Results',
        font: {
          size: 14
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 10,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 12
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Server Dashboard</h1>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Servers */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Servers
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {stats?.totalServers || 0}
            </dd>
          </div>
        </div>
        
        {/* Live Servers */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Live Servers
            </dt>
            <dd className="mt-1 flex items-baseline">
              <div className="text-3xl font-semibold text-green-600 dark:text-green-400">
                {stats?.statusCounts.live || 0}
              </div>
              <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600 dark:text-green-400">
                <ArrowUpIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" aria-hidden="true" />
                <span className="sr-only">Increased by</span>
                {stats?.totalServers ? Math.round((stats.statusCounts.live / stats.totalServers) * 100) : 0}%
              </div>
            </dd>
          </div>
        </div>
        
        {/* Shutdown Servers */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Shutdown Servers
            </dt>
            <dd className="mt-1 flex items-baseline">
              <div className="text-3xl font-semibold text-red-600 dark:text-red-400">
                {stats?.statusCounts.shutdown || 0}
              </div>
              <div className="ml-2 flex items-baseline text-sm font-semibold text-red-600 dark:text-red-400">
                <ArrowDownIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" aria-hidden="true" />
                <span className="sr-only">Decreased by</span>
                {stats?.totalServers ? Math.round((stats.statusCounts.shutdown / stats.totalServers) * 100) : 0}%
              </div>
            </dd>
          </div>
        </div>
        
        {/* New Servers */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              New Servers
            </dt>
            <dd className="mt-1 flex items-baseline">
              <div className="text-3xl font-semibold text-blue-600 dark:text-blue-400">
                {stats?.statusCounts.new || 0}
              </div>
              <div className="ml-2 flex items-baseline text-sm font-semibold text-blue-600 dark:text-blue-400">
                <span className="sr-only">New</span>
                {stats?.totalServers ? Math.round((stats.statusCounts.new / stats.totalServers) * 100) : 0}%
              </div>
            </dd>
          </div>
        </div>
      </div>

      {/* Charts - Rearranged Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Servers by Operating System */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Servers by Operating System</h2>
          <div className="h-80">
            <Bar data={osData} options={chartOptions} />
          </div>
        </div>

        {/* Servers by Application Owner */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Servers by Application Owner</h2>
          <div className="h-80">
            <Bar data={applicationOwnerData} options={chartOptions} />
          </div>
        </div>

        {/* Servers by Location */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Servers by Location</h2>
          <div className="h-80">
            <Bar data={locationData} options={chartOptions} />
          </div>
        </div>
        
        {/* Servers by Application */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Servers by Application</h2>
          <div className="h-80">
            <Bar data={applicationNameData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 