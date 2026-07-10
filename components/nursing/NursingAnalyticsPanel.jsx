'use client';

import { AreaChart, BarChart, Card, DonutChart, Grid, Metric, Text, Title } from '@tremor/react';

export default function NursingAnalyticsPanel({ metrics, seed }) {
  const completionData = [
    { metric: 'Quiz', completion: metrics.quizCompletion },
    { metric: 'Simulation', completion: metrics.simulationCompletion },
    { metric: 'Readiness', completion: metrics.reviewReadiness90Day },
    { metric: 'Assignments', completion: metrics.averageAssignmentScore || 0 },
  ];
  const paymentData = ['paid', 'pending', 'sponsored'].map((status) => ({
    name: status,
    value: seed.paymentRecords.filter((record) => record.paymentStatus === status).length,
  }));
  const timelineData = [
    { week: 'Week 1', posts: 8, comments: 14 },
    { week: 'Week 2', posts: 11, comments: 18 },
    { week: 'Week 3', posts: metrics.timelinePosts, comments: metrics.timelineComments },
  ];

  return (
    <Grid numItemsMd={2} numItemsLg={3} className="gap-4">
      <Card className="rounded-lg">
        <Text>Active students</Text>
        <Metric>{metrics.activeStudents}</Metric>
        <Text>{metrics.totalStudents} total learners</Text>
      </Card>
      <Card className="rounded-lg">
        <Title>Completion</Title>
        <BarChart data={completionData} index="metric" categories={['completion']} colors={['teal']} yAxisWidth={40} className="mt-4 h-56" />
      </Card>
      <Card className="rounded-lg">
        <Title>Payment access</Title>
        <DonutChart data={paymentData} category="value" index="name" colors={['emerald', 'amber', 'blue']} className="mt-4 h-56" />
      </Card>
      <Card className="rounded-lg md:col-span-2 lg:col-span-3">
        <Title>Community activity</Title>
        <AreaChart data={timelineData} index="week" categories={['posts', 'comments']} colors={['teal', 'blue']} className="mt-4 h-64" />
      </Card>
    </Grid>
  );
}
