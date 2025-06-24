'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create parent trackers
    const parentTrackers = await queryInterface.bulkInsert('soc_trackers', [
      {
        name: 'Security Vulnerability Management',
        description: 'Tracking security vulnerabilities and their remediation',
        parentId: null,
        ownership: 'Security Team',
        reviewer: 'CISO',
        frequency: 'Weekly',
        status: 'Active',
        timelines: 'Ongoing',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Compliance Checks',
        description: 'Regular compliance verification activities',
        parentId: null,
        ownership: 'Compliance Team',
        reviewer: 'CIO',
        frequency: 'Monthly',
        status: 'Active',
        timelines: 'Quarterly',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Incident Response',
        description: 'Tracking security incidents and response activities',
        parentId: null,
        ownership: 'SOC Team',
        reviewer: 'Security Manager',
        frequency: 'Daily',
        status: 'Active',
        timelines: 'Ongoing',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], { returning: true });

    // Get the IDs of the parent trackers
    const parentIds = parentTrackers.map(tracker => tracker.id);

    // Create child items for the first parent tracker
    await queryInterface.bulkInsert('soc_trackers', [
      {
        name: 'Critical Patching',
        description: 'Tracking of critical security patches',
        parentId: parentIds[0],
        trackerLink: 'https://example.com/patches',
        ownership: 'IT Operations',
        reviewer: 'Security Analyst',
        frequency: 'Weekly',
        status: 'In Progress',
        remarks: 'Focus on server infrastructure',
        timelines: '48 hours for critical vulnerabilities',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Vulnerability Scanning',
        description: 'Regular vulnerability scans of infrastructure',
        parentId: parentIds[0],
        trackerLink: 'https://example.com/scans',
        ownership: 'Security Team',
        reviewer: 'Security Lead',
        frequency: 'Bi-weekly',
        status: 'Completed',
        remarks: 'Last scan completed on schedule',
        timelines: 'Every two weeks',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Create child items for the second parent tracker
    await queryInterface.bulkInsert('soc_trackers', [
      {
        name: 'PCI DSS Compliance',
        description: 'Payment Card Industry Data Security Standard compliance checks',
        parentId: parentIds[1],
        trackerLink: 'https://example.com/pci',
        ownership: 'Compliance Team',
        reviewer: 'Compliance Manager',
        frequency: 'Quarterly',
        status: 'Scheduled',
        remarks: 'Next audit scheduled for end of quarter',
        timelines: 'Complete by Q4',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'GDPR Compliance',
        description: 'General Data Protection Regulation compliance verification',
        parentId: parentIds[1],
        trackerLink: 'https://example.com/gdpr',
        ownership: 'Legal Team',
        reviewer: 'Data Protection Officer',
        frequency: 'Quarterly',
        status: 'In Progress',
        remarks: 'Documentation review in progress',
        timelines: 'Complete by Q3',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Create child items for the third parent tracker
    return queryInterface.bulkInsert('soc_trackers', [
      {
        name: 'Security Alert Triage',
        description: 'Processing and triage of security alerts',
        parentId: parentIds[2],
        trackerLink: 'https://example.com/alerts',
        ownership: 'SOC Team',
        reviewer: 'SOC Analyst',
        frequency: 'Daily',
        status: 'Active',
        remarks: 'Continuous monitoring',
        timelines: '1 hour for critical alerts',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Incident Documentation',
        description: 'Documentation of security incidents and responses',
        parentId: parentIds[2],
        trackerLink: 'https://example.com/incidents',
        ownership: 'SOC Team',
        reviewer: 'Security Manager',
        frequency: 'As needed',
        status: 'Active',
        remarks: 'Updated for each incident',
        timelines: '24 hours after incident closure',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('soc_trackers', null, {});
  }
}; 