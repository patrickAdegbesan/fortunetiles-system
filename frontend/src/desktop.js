// Everything that belongs only to the desktop interface (its stylesheets and the big app). Loaded on demand so
// the POS terminal never downloads or parses any of it.
import './index.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import App from './App';
import './styles/ui-polish.css'; // keep after App so it overrides page styles
import './styles/professional.css'; // calm, consistent finish - always last

export default App;
