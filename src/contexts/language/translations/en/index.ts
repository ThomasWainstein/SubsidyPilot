
import { application } from './application';
import { common } from './common';
import { dashboard } from './dashboard';
import { euportal } from './euportal';
import { extension } from './extension';
import { farm } from './farm';
import { features } from './features';
import { footer } from './footer';
import { forms } from './forms';
import { home } from './home';
import { messages } from './messages';
import { navigation } from './navigation';
import { search } from './search';
import { simulation } from './simulation';
import { status } from './status';
import { subsidies } from './subsidies';
import { calendar } from './calendar';
import { admin } from './admin';

export const en = {
  ...application,
  ...common,
  ...dashboard,
  ...euportal,
  ...extension,
  ...farm,
  ...features,
  ...footer,
  ...forms,
  ...home,
  ...messages,
  ...navigation,
  ...search,
  ...simulation,
  ...status,
  ...subsidies,
  ...calendar,
  ...admin,
} as const;
