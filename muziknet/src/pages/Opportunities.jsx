function Opportunities() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Opportunities</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white shadow-md rounded-lg p-4">
            <h3 className="text-xl font-semibold">Opportunity {i + 1}</h3>
            <p className="text-gray-600">Type: Gig | Internship | Scholarship</p>
            <p className="text-gray-500 mt-2">Location: City, Country</p>
            <button className="mt-3 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Apply
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Opportunities;
