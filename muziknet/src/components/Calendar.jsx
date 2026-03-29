// src/components/Calendar.jsx
import { Calendar as BigCalendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { ChevronLeft, ChevronRight } from "lucide-react";

// The modern UI for the Calendar controls
const CustomToolbar = (toolbar) => {
  const goToBack = () => toolbar.onNavigate('PREV');
  const goToNext = () => toolbar.onNavigate('NEXT');
  const goToCurrent = () => toolbar.onNavigate('TODAY');

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
      <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200">
        <button onClick={goToBack} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"><ChevronLeft className="w-5 h-5 text-gray-600"/></button>
        <button onClick={goToCurrent} className="px-5 py-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-sm font-extrabold text-gray-700">Today</button>
        <button onClick={goToNext} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"><ChevronRight className="w-5 h-5 text-gray-600"/></button>
      </div>
      
      <span className="text-2xl font-extrabold text-gray-900 tracking-tight">{toolbar.label}</span>
      
      <div className="flex gap-1 bg-gray-50 p-1.5 rounded-2xl border border-gray-200">
        {toolbar.views.map(view => (
          <button 
            key={view} 
            onClick={() => toolbar.onView(view)}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              toolbar.view === view 
                ? 'bg-white shadow-sm text-brand-600 border border-gray-100' 
                : 'text-gray-500 hover:text-gray-900 border border-transparent'
            }`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

const localizer = momentLocalizer(moment);

export default function Calendar({ 
  events = [], 
  onSelectEvent = () => {}, 
  defaultView = "month", 
  selectable = false,
  eventPropGetter,
  components 
}) {
  return (
    <div className="h-full min-h-[600px] font-sans">
      <BigCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView={defaultView}
        onSelectEvent={onSelectEvent}
        selectable={selectable}
        eventPropGetter={eventPropGetter}
        components={{
          toolbar: CustomToolbar, // Injecting our custom UI here
          ...components
        }}
      />
    </div>
  );
}