export default function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="spinner mb-4"></div>
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  );
}
