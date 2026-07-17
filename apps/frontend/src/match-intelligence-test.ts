import 'zone.js/dist/zone-testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);

import './app/features/match-intelligence/match-intelligence-data.service.spec';
import './app/features/match-intelligence/match-intelligence.component.spec';
import './app/cricket-odds/analytics.service.spec';
