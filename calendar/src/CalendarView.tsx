import { Center, Text } from "@dotnaos/react-ui";
import type { CalendarInput, CalendarOutput, View } from './types';
import { CalendarInputSchema, CalendarOutputSchema } from './types';

function CalendarViewComponent({ input }: { input: CalendarInput }) {
    return (
        <Center className="h-full bg-neutral-100 dark:bg-neutral-900">
            <Text>Calendar Placeholder ({input.events.length} events)</Text>
        </Center>
    );
}

export const calendarView: View<CalendarInput, CalendarOutput> = {
    name: 'calendar',
    input: CalendarInputSchema,
    output: CalendarOutputSchema,
    render: (input) => <CalendarViewComponent input={input} />,
};
