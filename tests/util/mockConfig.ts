import { Configuration } from '../../src/utils/Configuration';

const mockConfig = () => {
  // @ts-ignore
  Configuration.instance = new Configuration('../../src/config/config.yml');
};

export default mockConfig;
