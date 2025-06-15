export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center animate-ping rounded-full size-12 border-t border-b border-primary">
      <div className="animate-spin rounded-full size-4 border-t border-b border-primary"></div>
    </div>
  );
}
