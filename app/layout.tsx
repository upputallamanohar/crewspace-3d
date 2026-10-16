import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Crewspace — Dream it. Crew it. Do it.',description:'A bright interactive 3D playground for ten collaborative projects. Bring your ideas to life.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}

