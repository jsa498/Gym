# Modern Workout Tracker

A modern, responsive workout tracking application built with Next.js, React, Tailwind CSS, and Shadcn UI.

## Features

- **User Management**: Switch between different user profiles (Mottu and Babli)
- **Workout Schedule**: Organized by days of the week (Monday, Wednesday, Thursday, Saturday)
- **Exercise Tracking**: Log sets for each exercise with details like warm-ups, weight, reps, and goals
- **Data Persistence**: All workout data is stored in the browser's localStorage
- **Modern UI**: Beautiful, responsive interface built with Shadcn UI components
- **Dark Mode**: Sleek dark theme for comfortable viewing in all environments

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/)
- **State Management**: React Context API
- **Data Storage**: Browser localStorage

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

## Project Structure

- `src/app`: Next.js app directory
- `src/components`: React components
  - `src/components/ui`: Shadcn UI components
- `src/lib`: Utility functions and context providers

## Data Structure

The app uses localStorage to persist workout data with the following structure:

- Keys are formatted as `{username}-{exerciseName}`
- Values are arrays of set objects containing:
  - Warm-up details
  - Weight in pounds
  - Number of reps
  - Goal
