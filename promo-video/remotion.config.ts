import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// Blur kaca (backdrop-filter) butuh GPU angle agar render tidak pucat.
Config.setChromiumOpenGlRenderer('angle');
