import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormulaEditor } from './components/FormulaInput';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: '20px' }}>
        <h1>Formula Input</h1>
        <FormulaEditor />
      </div>
    </QueryClientProvider>
  );
}

export default App;