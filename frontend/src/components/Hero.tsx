import { useAuth0 } from '@auth0/auth0-react';
import SampleQuestion from './SampleQuestion';

interface HeroProps {
  onStartClick: () => void;
}

export default function Hero({ onStartClick }: HeroProps) {
  const { isAuthenticated, loginWithRedirect } = useAuth0();

  const handleCta = () => {
    if (isAuthenticated) {
      onStartClick();
    } else {
      loginWithRedirect();
    }
  };

  return (
    <section className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-16 sm:py-20 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight">
              Practice the IFAB Laws of the Game
            </h1>
            <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">
              A quiz tool for football referees. Take timed exams, drill on
              specific laws, and review every answer with the relevant Law
              reference.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button onClick={handleCta} className="btn-primary">
                {isAuthenticated ? 'Browse quizzes' : 'Sign in'}
              </button>
              <button onClick={onStartClick} className="btn-secondary">
                View available quizzes
              </button>
            </div>
          </div>

          <div className="lg:justify-self-end w-full max-w-md mx-auto lg:mx-0">
            <SampleQuestion />
          </div>
        </div>

        <div className="mt-14 sm:mt-16 grid gap-6 sm:grid-cols-3 text-sm border-t border-gray-100 pt-10">
          <FeatureItem title="Timed or untimed">
            Optional countdown with auto-submit on expiry.
          </FeatureItem>
          <FeatureItem title="Filter by law">
            Restrict a quiz to a single Law to focus practice.
          </FeatureItem>
          <FeatureItem title="Reviewable results">
            Every answer comes with an explanation and Law reference.
          </FeatureItem>
        </div>
      </div>
    </section>
  );
}

function FeatureItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-gray-600 leading-relaxed">{children}</p>
    </div>
  );
}
