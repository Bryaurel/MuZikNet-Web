import { Link, Outlet } from "react-router-dom";

function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="bg-blue-500 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">MuZikNet</h1>
        <div className="space-x-4">
          <Link to="/" className="hover:underline">Home</Link>
          <Link to="/profile" className="hover:underline">Profile</Link>
          <Link to="/messages" className="hover:underline">Messages</Link>
          <Link to="/opportunities" className="hover:underline">Opportunities</Link>
          <Link to="/booking" className="hover:underline">Booking</Link>
        </div>
      </nav>

      {/* Page Content */}
      <main className="flex-1 p-4">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 text-gray-700 p-4 text-center">
        © 2025 MuZikNet
      </footer>
    </div>
  );
}

export default Layout;
