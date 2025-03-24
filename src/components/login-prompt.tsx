'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LoginPromptProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function LoginPrompt({ isOpen, onClose, message = 'Please sign in to log workout sets and track your progress' }: LoginPromptProps) {
  const router = useRouter();

  const handleSignIn = () => {
    router.push('/auth');
    onClose();
  };
  
  const handleSignUp = () => {
    router.push('/auth/signup');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-black text-white border-white/20 p-4 sm:p-6 max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-xl md:text-2xl font-bold">Account Required</DialogTitle>
          <DialogDescription className="text-white/80 space-y-3 mt-3">
            <p className="text-sm sm:text-base">{message}</p>
            <p className="pt-1 sm:pt-2 text-sm sm:text-base font-medium">Why create an account?</p>
            <ul className="list-disc pl-5 text-xs sm:text-sm space-y-2.5 pt-1">
              <li className="leading-relaxed">Track and save your workout progress</li>
              <li className="leading-relaxed">Customize workout days and exercises</li>
              <li className="leading-relaxed">Access your workouts from any device</li>
              <li className="leading-relaxed">We never share your data with third parties</li>
            </ul>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 flex justify-between w-full">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 text-sm py-3 sm:py-2 h-auto rounded-lg w-[30%]"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleSignIn}
            className="bg-white/20 text-white hover:bg-white/30 text-sm py-3 sm:py-2 h-auto rounded-lg w-[30%]"
          >
            Sign In
          </Button>
          <Button
            onClick={handleSignUp}
            className="bg-white text-black hover:bg-white/90 text-sm py-3 sm:py-2 h-auto font-medium rounded-lg w-[30%]"
          >
            Create Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 