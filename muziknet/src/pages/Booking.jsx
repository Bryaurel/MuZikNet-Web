function Booking() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Book a Musician</h2>
      <form className="bg-white shadow-md rounded-lg p-6 space-y-4">
        <input type="text" placeholder="Musician Name" className="border p-2 w-full rounded"/>
        <input type="date" className="border p-2 w-full rounded"/>
        <input type="text" placeholder="Event Location" className="border p-2 w-full rounded"/>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Book
        </button>
      </form>
    </div>
  );
}

export default Booking;
