import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LiveBannerComponent } from './live-banner.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('LiveBannerComponent', () => {
  let component: LiveBannerComponent;
  let fixture: ComponentFixture<LiveBannerComponent>;
  let bannerElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LiveBannerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LiveBannerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display banner when finalUrl is provided', () => {
    component.finalUrl = '/match/ipl/2023/mi-vs-csk/t20/2023-05-29';
    fixture.detectChanges();

    bannerElement = fixture.debugElement.query(By.css('.live-banner'));
    expect(bannerElement).toBeTruthy();
  });

  it('should not display banner when finalUrl is undefined', () => {
    component.finalUrl = undefined;
    fixture.detectChanges();

    bannerElement = fixture.debugElement.query(By.css('.live-banner'));
    expect(bannerElement).toBeFalsy();
  });

  it('should render link with correct href', () => {
    const testUrl = '/match/ipl/2023/mi-vs-csk/t20/2023-05-29';
    component.finalUrl = testUrl;
    fixture.detectChanges();

    const linkElement: HTMLAnchorElement = fixture.debugElement.query(
      By.css('.live-banner__link')
    ).nativeElement;

    expect(linkElement.getAttribute('href')).toBe(testUrl);
  });

  it('should have rel="canonical" on link', () => {
    component.finalUrl = '/match/ipl/2023/mi-vs-csk/t20/2023-05-29';
    fixture.detectChanges();

    const linkElement: HTMLAnchorElement = fixture.debugElement.query(
      By.css('.live-banner__link')
    ).nativeElement;

    expect(linkElement.getAttribute('rel')).toBe('canonical');
  });

  it('should display animated icon', () => {
    component.finalUrl = '/match/ipl/2023/mi-vs-csk/t20/2023-05-29';
    fixture.detectChanges();

    const iconElement = fixture.debugElement.query(By.css('.live-banner__icon'));
    expect(iconElement).toBeTruthy();

    const animateElement = iconElement.nativeElement.querySelector('animate');
    expect(animateElement).toBeTruthy();
    expect(animateElement.getAttribute('attributeName')).toBe('opacity');
  });
});
