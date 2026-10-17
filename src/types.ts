export type AppMode =
  | 'mainMenu'
  | 'blsSceneSafety'
  | 'blsCheckResponse'
  | 'blsCallHelp'
  | 'sideCalibration'
  | 'transitionSideToFront'
  | 'frontCalibration'
  | 'handPlacement'
  | 'activeCPR'
  | 'aedScenario'
  | 'summary';

export type SessionType = 'training' | 'realtime';

export interface Point2D {
  x: number;
  y: number;
  conf: number;
}

export interface PoseLandmarks {
  leftShoulder: Point2D | null;
  leftElbow: Point2D | null;
  leftWrist: Point2D | null;
  leftHip: Point2D | null;
  rightShoulder: Point2D | null;
  rightElbow: Point2D | null;
  rightWrist: Point2D | null;
  rightHip: Point2D | null;
}

export interface CallKeywords {
  call1669: boolean;
  unconscious: boolean;
  requestAED: boolean;
}

export interface BLSCompleted {
  sceneSafety: boolean;
  checkResponse: boolean;
  callHelp: boolean;
  aedUsed: boolean;
}

export interface ClearanceKeywords {
  iClear: boolean; // ผม/ฉันถอย
  youClear: boolean; // คุณถอย
  everybodyClear: boolean; // ทุกคนถอย
}
