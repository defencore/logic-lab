export const elevator = {
  elevatorDriveConflict:
    'Elevator fault: UP and DOWN were commanded together. Remove the conflict and reset.',
  elevatorDoorConflict:
    'Elevator fault: OPEN and CLOSE were commanded together. Remove the conflict and reset.',
  elevatorDoorMotion:
    'Elevator fault: travel was commanded with open doors or OPEN active. Repair the interlock and reset.',
  elevatorBetweenFloors:
    'Elevator fault: OPEN was commanded between floor alignment zones. Repair the controller and reset.',
};
