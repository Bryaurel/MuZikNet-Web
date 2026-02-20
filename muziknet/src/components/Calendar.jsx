// src/components/Calendar.jsx
import { Calendar as BigCalendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

/**
 * Simple Calendar wrapper using react-big-calendar (moment localizer)
 * Props:
 * - events: [{ id, title, start: Date, end: Date, meta: {...} }]
 * - onSelectEvent(event)
 * - defaultView, selectable
 *
 * NOTE: uses moment. Make sure to `npm install react-big-calendar moment`
 */

const localizer = momentLocalizer(moment);

export default function Calendar({ events = [], onSelectEvent = () => {}, defaultView = "month", selectable = false }) {
  return (
    <div style={{ height: 600 }}>
      <BigCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView={defaultView}
        onSelectEvent={onSelectEvent}
        selectable={selectable}
        style={{ height: "100%" }}
      />
    </div>
  );
}
