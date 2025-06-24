'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('servers', [
      {
        ip: '192.168.1.10',
        hostname: 'app-server-01',
        operatingSystem: 'Ubuntu 20.04 LTS',
        serverRole: 'Application Server',
        serverType: 'Virtual Machine',
        applicationName: 'CRM System',
        applicationSPOC: 'John Smith',
        applicationOwner: 'Sales Department',
        platform: 'VMware',
        location: 'US East',
        manufacturer: 'Dell',
        ram: '32GB',
        cpu: 'Intel Xeon 8-core',
        status: 'live',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        ip: '192.168.1.11',
        hostname: 'db-server-01',
        operatingSystem: 'Red Hat Enterprise Linux 8',
        serverRole: 'Database Server',
        serverType: 'Physical',
        applicationName: 'Customer Database',
        applicationSPOC: 'Jane Doe',
        applicationOwner: 'IT Department',
        platform: 'Bare Metal',
        location: 'US West',
        manufacturer: 'HP',
        ram: '64GB',
        cpu: 'AMD EPYC 16-core',
        status: 'live',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        ip: '192.168.1.12',
        hostname: 'web-server-01',
        operatingSystem: 'Windows Server 2019',
        serverRole: 'Web Server',
        serverType: 'Virtual Machine',
        applicationName: 'Corporate Website',
        applicationSPOC: 'Alex Johnson',
        applicationOwner: 'Marketing Department',
        platform: 'Hyper-V',
        location: 'EU Central',
        manufacturer: 'Cisco',
        ram: '16GB',
        cpu: 'Intel Xeon 4-core',
        status: 'shutdown',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        ip: '192.168.1.13',
        hostname: 'mail-server-01',
        operatingSystem: 'Ubuntu 22.04 LTS',
        serverRole: 'Mail Server',
        serverType: 'Virtual Machine',
        applicationName: 'Corporate Email',
        applicationSPOC: 'Maria Garcia',
        applicationOwner: 'IT Department',
        platform: 'AWS EC2',
        location: 'US East',
        manufacturer: 'Amazon',
        ram: '8GB',
        cpu: 'Intel Xeon 2-core',
        status: 'live',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        ip: '192.168.1.14',
        hostname: 'test-server-01',
        operatingSystem: 'CentOS 7',
        serverRole: 'Test Server',
        serverType: 'Virtual Machine',
        applicationName: 'QA Testing',
        applicationSPOC: 'Robert Lee',
        applicationOwner: 'QA Department',
        platform: 'VMware',
        location: 'US West',
        manufacturer: 'Dell',
        ram: '16GB',
        cpu: 'Intel Xeon 4-core',
        status: 'new',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('servers', null, {});
  }
}; 