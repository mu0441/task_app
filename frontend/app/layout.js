import "./globals.css"; 
export const metadata = { title: "Task Board", description: "Trello-like Task App" };

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased">
        <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
      </body>
    </html>
  );
}
