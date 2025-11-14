function Messages() {
  return (
    <div className="flex h-[70vh] border rounded overflow-hidden">
      <div className="w-1/3 bg-gray-100 p-4 overflow-y-auto">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-2 bg-white rounded mb-2 cursor-pointer hover:bg-gray-200">
            Contact {i + 1}
          </div>
        ))}
      </div>
      <div className="flex-1 p-4 bg-white flex flex-col justify-between">
        <div className="flex-1 overflow-y-auto">
          {[...Array(3)].map((_, i) => (
            <p key={i} className="mb-2">
              <span className="font-bold">User:</span> Message {i + 1}
            </p>
          ))}
        </div>
        <input 
          type="text" 
          placeholder="Type a message..." 
          className="border p-2 rounded w-full"
        />
      </div>
    </div>
  );
}

export default Messages;
