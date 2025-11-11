import { useMemo, useEffect, useState } from 'react'
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride'
import FancyTooltip from './FancyTooltip'

interface TourGuideProps {
  storageKey?: string
  steps?: Step[]
}

export default function TourGuide({
  storageKey = 'tour_dashboard_seen',
  steps: customSteps,
}: TourGuideProps) {
  const [run, setRun] = useState(false)

  // Default dashboard tour steps
  const defaultSteps: Step[] = useMemo(
    () => [
      {
        target: '[data-tour-id="dashboard-title"]',
        title: 'Welcome to Your Dashboard! 🎉',
        content:
          'This is your command center. Let\'s take a quick tour to show you around!',
        disableBeacon: true,
      },
      {
        target: '[data-tour-id="boards-link"]',
        title: 'Boards',
        content:
          'Organize your projects with boards. Each board can have multiple tasks and team members.',
      },
      {
        target: '[data-tour-id="tasks-link"]',
        title: 'Tasks',
        content:
          'View and manage all your tasks in one place. Filter by status, assignee, or board.',
      },
      {
        target: '[data-tour-id="contacts-link"]',
        title: 'Contacts',
        content:
          'Keep track of your contacts, clients, and team members. Add notes and attachments.',
      },
      {
        target: '[data-tour-id="time-link"]',
        title: 'Time Tracking',
        content:
          'Clock in/out and track your work hours. Managers can review and approve time entries.',
      },
      {
        target: '[data-tour-id="file-storage"]',
        title: 'Important Files',
        content:
          'Upload and manage important documents. Files are securely stored and easy to access.',
      },
      {
        target: '[data-tour-id="features-link"]',
        title: 'Features',
        content:
          'Check out all available features and upcoming updates here.',
      },
    ],
    []
  )

  const steps = customSteps || defaultSteps

  useEffect(() => {
    // Check if user has seen the tour
    const seen = localStorage.getItem(storageKey)
    if (!seen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setRun(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [storageKey])

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED]

    if (finishedStatuses.includes(status)) {
      localStorage.setItem(storageKey, '1')
      setRun(false)
    }
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      scrollToFirstStep
      disableOverlayClose={false}
      tooltipComponent={FancyTooltip}
      styles={{
        options: {
          zIndex: 99999,
          primaryColor: '#2563eb',
        },
      }}
      callback={handleJoyrideCallback}
    />
  )
}
